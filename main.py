# see https://pillow.readthedocs.io/en/stable/handbook/tutorial.html
from PIL import Image, ImageSequence

g_frame_metrics = {}

def reduce_256_to_16(val):
    return val // 16

def reduce_color(pixel):
    reduced = list(map(reduce_256_to_16, pixel))
    return 256 * reduced[0] + 16 * reduced[1] + reduced[2]

# # unused utilities =====================================================
# def pixel_at(pixel_data, frame, i, j):
#     return pixel_data[j * frame.size[0] + i]

# def linear_to_ij(linear, frame):
#     width = frame.size[0]
#     j = linear // width
#     i = linear - j * width
#     return [i, j]
# # ======================================================================

def get_color_histogram(frame):
    pixels = list(frame.getdata())
    width, height = frame.size
    color_histo = {}
    start_j = height // 4 # skip the first 25% of lines
    back_reducol = reduce_color(pixels[start_j * width])
    for j in range(start_j, height):
        for i in range(width):
            pixel = pixels[j * width + i]
            single = reduce_color(pixel)
            if single in color_histo:
                color_histo[single] += 1
            else:
                color_histo[single] = 1

    del color_histo[back_reducol]
    return color_histo

def get_sprite_bbox(frame):
    # TODO: extract reducol logic to happen once before both
    # get_sprite_bbox and get_color_histogram
    pixels = list(frame.getdata())
    reducols = list(map(reduce_color, pixels))
    i_lo, j_lo, i_hi, j_hi = [-1, -1, -1, -1]
    frame_width, frame_height = frame.size
    start_j = frame_height // 4 # skip the first 25% of lines
    linear_idx = start_j * frame_width - 1
    back_reducol = reducols[linear_idx]
    for j in range(start_j, frame_height):
        for i in range(frame_width):
            linear_idx += 1
            is_sprite = reducols[linear_idx] != back_reducol
            if is_sprite:
                if i_lo == -1 or i < i_lo:
                    i_lo = i
                if j_lo == -1 or j < j_lo:
                    j_lo = j
                if i_hi == -1 or i > i_hi:
                    i_hi = i
                if j_hi == -1 or j > j_hi:
                    j_hi = j

    sprite_width = i_hi - i_lo + 1
    sprite_height = j_hi - j_lo + 1

    return [i_lo, j_lo, sprite_width, sprite_height]

def scan_frame(frame, frame_idx):
    if (frame_idx == 0):
        return True

    g_frame_metrics[frame_idx] = {
        'color_histo': get_color_histogram(frame),
        'sprite_bbox': get_sprite_bbox(frame) 
    }
    return True

def spritify_recording():
    frame_idx = 0
    with Image.open("./proto_walk_ne.gif") as im:
        # Step One: collect metrics for every frame

        for frame in ImageSequence.Iterator(im):
            scan_frame(frame, frame_idx)
            frame_idx += 1

        frame_count = frame_idx
        g_frame_metrics[1]['eq_prior'] = -1
        unique_frame_first_idxs = [1]

        # Step Two: find unique frames

        for t_frame_idx in range(2, frame_count):
            colors = g_frame_metrics[t_frame_idx]['color_histo']
            bbox = g_frame_metrics[t_frame_idx]['sprite_bbox']
            eq_prior = -1
            
            for prior_frame_idx in unique_frame_first_idxs:
                prior_colors = g_frame_metrics[prior_frame_idx]['color_histo']
                prior_bbox = g_frame_metrics[prior_frame_idx]['sprite_bbox']
                if bbox == prior_bbox and colors == prior_colors:
                    eq_prior = prior_frame_idx
                    break
            
            g_frame_metrics[t_frame_idx]['eq_prior'] = eq_prior
            if eq_prior == -1:
                unique_frame_first_idxs.insert(0, t_frame_idx)

            print(f'frame => {t_frame_idx}')
            print(f'bbox  => {bbox}')
            print(f'color => {colors}')
            print(f'prior => {eq_prior}')

        print(f'unique_frame_first_idxs => {unique_frame_first_idxs}')
        print("IMPORTANT: piskel.app unique are ONE HIGHER than these")
        print("   not sure why")


        print("Cycle")

        # Step Three: compare unique frames to get animation timings

        cycle_list = []
        frame_uniq = -1
        prior_frame_uniq = -1
        sprite_frames = 0
        for frame_idx in range(1, frame_count):
            frame_uniq = g_frame_metrics[frame_idx]['eq_prior']
            if frame_uniq == -1:
                frame_uniq = frame_idx

            if frame_uniq == prior_frame_uniq:
                sprite_frames += 1
            elif prior_frame_uniq != -1:
                cycle_list.append([prior_frame_uniq, sprite_frames])
                sprite_frames = 1

            prior_frame_uniq = frame_uniq

        print(cycle_list)
    return True

def save_first_sprite(frame):
    pixels = list(frame.getdata())
    width, height = frame.size

    return


# Main Execution
spritify_recording()

# Cycle List
# Note Piskel.App Frames Off By 1
#
# Proto Walk Down
# [[1, 6], [4, 6], [10, 6], [16, 6], [22, 6], [28, 6]]
#
# Proto Walk SE
# [[1, 6], [7, 6], [13, 6], [19, 6], [25, 6], [31, 6]]
#
# Proto Walk Right
# [[1, 6], [6, 6], [12, 6], [18, 6], [24, 6], [30, 6]]
#
# Proto Walk NE
# [[1, 6], [4, 6], [10, 6], [16, 6], [22, 6], [28, 6]]
#
# Proto Walk Up
# [[1, 6], [4, 6], [10, 6], [16, 6], [22, 6], [28, 6]]